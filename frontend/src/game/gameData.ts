import { Application, ICanvas } from "pixi.js";
import SocketApi from "../api/socketApi";
import { GameDTO } from "../model/GameDTO";
import { GameResponse } from "../model/GameResponseDTO";
import { GameStateDTO, GameStartDTO } from "../model/GameStateDTO";
import { BoxSize, Offset } from "../model/GameModels";
import { ReactPixiRoot, createRoot, AppProvider } from "@pixi/react";
import { clamp, debounce } from "lodash";
import GameEntity, { GameBlackhole } from "../model/GameEntities";

export class GameData {
  socketApi: SocketApi;
  private _pongPosition: Offset = { x: 800, y: 450 };
  private _pongSpeed: Offset = { x: 12, y: 8 };
  leftPaddlePosition: Offset = { x: 0, y: 0 };
  rightPaddlePosition: Offset = { x: 0, y: 0 };
  usingLocalTick: boolean = false;
  isLeft: boolean = true;
  gameDisplayed: boolean = false;
  gameStarted: boolean = false;
  gameRoom: string = "";
  gameEntities: GameEntity[] = [];

  setScale?: (scale: number) => void;
  setShouldRender?: (shouldRender: boolean) => void;
  setShouldDisplayGame?: (shouldDisplayGame: boolean) => void;
  private sendPlayerMove?: (y: number, gameRoom: string) => void;

  resize?: () => void;

  constructor() {
    this.socketApi = new SocketApi("game");
    this.socketApi.listen("gameLoop", this.listenToGameLoopCallBack);
    this.socketApi.listen("gameState", this.listenToGameState);
    this.socketApi.listen("gameResponse", this.listenToGameResponse);
    this.sendPlayerMove = debounce((y: number, gameRoom: string) => {
      // console.log("sending player move");
      this.socketApi.sendMessages("playerMove", { gameRoom: gameRoom, y: y });
    }, 1);
  }

  get pongPosition() {
    return { ...this._pongPosition } as Readonly<Offset>;
  }

  get pongSpeed() {
    return { ...this._pongSpeed } as Readonly<Offset>;
  }

  joinQueue(queueType: string) {
    this.socketApi.sendMessages("joinQueue", { queue: queueType });
  }

  leaveQueue() {
    this.socketApi.sendMessages("leaveQueue", {});
  }

  startGame() {
    if (this.gameStarted) {
      console.error("game already started");
      return;
    }
    console.log("start game");
    this.gameStarted = true;
    if (this.setShouldRender) this.setShouldRender?.(true);
    this.gameEntities.push(
      new GameBlackhole({ x: 900, y: 450, w: 100, h: 100 }, 2)
    );
    this.gameEntities.push(
      new GameBlackhole({ x: 300, y: 450, w: 100, h: 100 }, 2)
    );
    this.gameEntities.push(
      new GameBlackhole({ x: 250, y: 200, w: 100, h: 100 }, 2)
    );
    this.gameEntities.push(
      new GameBlackhole({ x: 1100, y: 0, w: 100, h: 100 }, 2)
    );
  }

  displayGame() {
    if (this.gameDisplayed) {
      console.error("game already displayed");
      return;
    }
    const canvas = document.getElementById("pixi") as HTMLCanvasElement;
    canvas.style.display = "block";
    this.resize = () => {
      const aspectRatio = 16 / 9;
      const clampedWidth = clamp(window.innerWidth, 0, 1600);
      const clampedHeight = clamp(window.innerHeight, 0, 900);
      const newWidth = Math.min(clampedWidth, clampedHeight * aspectRatio);
      const newHeight = Math.min(clampedHeight, clampedWidth / aspectRatio);
      const newTop = (window.innerHeight - newHeight) / 2;
      const newLeft = (window.innerWidth - newWidth) / 2;
      document.documentElement.style.setProperty("--canvas-top", `${newTop}px`);
      document.documentElement.style.setProperty(
        "--canvas-left",
        `${newLeft}px`
      );
      canvas.width = newWidth;
      canvas.height = newHeight;
      canvas.style.width = newWidth + "px";
      canvas.style.height = newHeight + "px";
    };
    window.addEventListener("resize", this.resize);
    this.resize();
    this.gameDisplayed = true;
  }

  stopDisplayGame() {
    if (!this.gameDisplayed) {
      console.error("game already stopped displaying");
      return;
    }
    const canvas = document.getElementById("pixi") as HTMLCanvasElement;
    canvas.style.display = "none";
    window.removeEventListener("resize", this.resize!);
  }

  endGame() {
    console.log("end game");
    if (!this.gameStarted) return;
    this.gameStarted = false;
    this.setShouldRender?.(false);
    this.socketApi.removeListener("gameLoop");
    this.socketApi.removeListener("gameState");
    this.socketApi.removeListener("gameResponse");
    this.leaveQueue();
    this.gameEntities = [];
    if (this.setShouldDisplayGame) this.setShouldDisplayGame?.(false);
  }

  set setSetScale(setScale: (scale: number) => void) {
    this.setScale = setScale;
  }

  set setSetShouldRender(setShouldRender: (shouldRender: boolean) => void) {
    this.setShouldRender = setShouldRender;
  }

  set setSetShouldDisplayGame(
    setShouldDisplayGame: (startMatch: boolean) => void
  ) {
    this.setShouldDisplayGame = setShouldDisplayGame;
  }

  listenToGameState = (state: GameStateDTO) => {
    if (state.type === "GameStart") {
      this.isLeft = (<GameStartDTO>state.data).isLeft;
      this.gameRoom = (<GameStartDTO>state.data).gameRoom;
    }
  };

  listenToGameLoopCallBack = (data: GameDTO) => {
    // console.log(data.ballPosX, data.ballPosY);
    this._pongPosition = { x: data.ballPosX, y: data.ballPosY };
    if (this.isLeft) {
      this.rightPaddlePosition = { x: 1600 - 45, y: data.rightPaddlePosY };
    } else {
      this.leftPaddlePosition = { x: 30, y: data.leftPaddlePosY };
    }
    this._pongSpeed = { x: data.ballVelX, y: data.ballVelY };
  };

  listenToGameResponse = (data: GameResponse) => {
    // console.log(data);
  };

  updatePlayerPosition(y: number) {
    if (this.isLeft) {
      this.leftPaddlePosition = { x: 30, y: y };
    } else {
      this.rightPaddlePosition = { x: 1600 - 46, y: y };
    }
    this.sendPlayerMove?.(y, this.gameRoom);
  }

  useLocalTick() {
    this.usingLocalTick = true;
    this._pongSpeed = { x: 5, y: 5 };
    this._localTick();
  }

  disableLocalTick() {
    this.usingLocalTick = false;
  }

  private _localTick() {
    if (!this.useLocalTick) return;
    if (this._pongPosition.x < 0 || this._pongPosition.x > 1600 - 46)
      this._pongSpeed.x *= -1;
    if (this._pongPosition.y < 0 || this._pongPosition.y > 900 - 46)
      this._pongSpeed.y *= -1;

    this._pongPosition.x += this.pongSpeed.x;
    this._pongPosition.y += this.pongSpeed.y;
    requestAnimationFrame(this.useLocalTick);
  }
}
