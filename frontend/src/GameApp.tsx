import React, { createContext, useEffect, useMemo, useState } from 'react'
import { GameData } from './game/gameData'
import { AppProvider, Container } from '@pixi/react';
import { Application, ICanvas } from 'pixi.js';
import Game from './game/Game';

interface GameAppProps {
  pixiApp: Application<ICanvas>;
  gameData: GameData;
}

export let GameDataCtx = createContext<GameData>(undefined as any);

let mouseLastMoveTime: number = 0;

function GameApp(props: GameAppProps) {
  const [scale, setScale] = useState<number>(1);
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  const [usingTicker, setUsingTicker] = useState<boolean>(true);

  const { pixiApp, gameData } = props;
  useEffect(() => {
    gameData.setSetShouldRender = setShouldRender;
    gameData.setSetScale = setScale;
    gameData.setSetUsingTicker = setUsingTicker;
    return () => {
      gameData.endGame()
    }
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('pixi') as HTMLCanvasElement
    canvas.addEventListener('mousemove', onmousemove);
    canvas.addEventListener('mousedown', onmousedown);
    canvas.addEventListener('mouseup', onmouseup);
    return () => {
      canvas.removeEventListener('mousemove', onmousemove);
      canvas.removeEventListener('mousedown', onmousedown);
      canvas.removeEventListener('mouseup', onmouseup);
    }
  }, [scale]);
  return (
    <AppProvider value={pixiApp}>
      <GameDataCtx.Provider value={gameData}>
        <Game shouldRender={shouldRender} scale={scale} usingTicker={usingTicker} />
      </GameDataCtx.Provider>
    </AppProvider>
  )

  function onmousemove(e: MouseEvent) {
    const currentTime = Date.now();
    if (currentTime - mouseLastMoveTime < 16) return;
    mouseLastMoveTime = currentTime;
    gameData.updatePlayerPosition(e.offsetY / gameData.gameMaxHeight * 900 / scale);
  }

  function onmousedown() {
    gameData.updatePlayerClick(true);
  }

  function onmouseup() {
    gameData.updatePlayerClick(false);
  }
}

export default GameApp