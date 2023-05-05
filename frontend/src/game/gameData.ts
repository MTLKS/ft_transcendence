import { Application, ICanvas } from "pixi.js";
import SocketApi from "../api/socketApi";
import { GameDTO } from "../modal/GameDTO";
import { BoxSize, Offset } from "../modal/GameModels";
import { ReactPixiRoot, createRoot, AppProvider } from "@pixi/react";

export class GameData {
  socketApi: SocketApi;
  private _pongPosition: Offset;
  private _pongSpeed: Offset;
  leftPaddlePosition: Offset;
  rightPaddlePosition: Offset;
  usingLocalTick: boolean = false;
  isLeft: boolean = true;
  roomID: string | undefined;

  setScale?: (scale: number) => void;

  constructor() {
    this.socketApi = new SocketApi("game");
    this._pongPosition = { x: 800, y: 450 };
    this.leftPaddlePosition = { x: 0, y: 0 };
    this.rightPaddlePosition = { x: 0, y: 0 };
    this._pongSpeed = { x: 0, y: 0 };
    this.socketApi.sendMessages("startGame", {});
    this.socketApi.listen("gameLoop", this.listenToGameLoopCallBack);
    this.socketApi.listen("gameState", this.listenToGameState);
  }

  get pongPosition() {
    return { ...this._pongPosition } as Readonly<Offset>;
  }

  get pongSpeed() {
    return { ...this._pongSpeed } as Readonly<Offset>;
  }

  destructor() {
    this.socketApi.removeListener("gameLoop");
    this.socketApi.removeListener("gameState");
  }

  set setSetScale(setScale: (scale: number) => void) {
    this.setScale = setScale;
  }

  listenToGameState = (data: any) => {
    console.log(data);
  };

  listenToGameLoopCallBack = (data: GameDTO) => {
    // console.log(data.ballPosX, data.ballPosY);
    this._pongPosition = { x: data.ballPosX, y: data.ballPosY };
    if (this.isLeft) {
      this.rightPaddlePosition = { x: 1600 - 46, y: data.rightPaddlePosY };
    } else {
      this.leftPaddlePosition = { x: 30, y: data.leftPaddlePosY };
    }
    this._pongSpeed = { x: data.ballVelX, y: data.ballVelY };
  };

  set isLeftPlayer(isLeft: boolean) {
    this.isLeft = isLeft;
  }

  updatePlayerPosition(y: number) {
    if (this.isLeft) {
      this.leftPaddlePosition = { x: 30, y: y };
    } else {
      this.rightPaddlePosition = { x: 1600 - 46, y: y };
    }

    if (this.roomID)
      this.socketApi.sendMessages("playerMove", { y: y, roomID: this.roomID });
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