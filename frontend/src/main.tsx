import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { createRoot } from '@pixi/react';
import { Application } from 'pixi.js';

import { GameData } from './game/gameData';
import GameApp from './GameApp';

const reactApp = document.getElementById('root') as HTMLElement
const reactRoot = ReactDOM.createRoot(reactApp)
reactRoot.render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

export const gameTick = new GameData();
const pixiApp = new Application({
  width: 1600,
  height: 900,
  sharedTicker: true,
  autoDensity: true,
  backgroundColor: 0x242424,
  view: document.getElementById('pixi') as HTMLCanvasElement,
  antialias: true,
});

let mouseLastMoveTime: number = 0;
window.addEventListener('mousemove', (e) => {
  const currentTime = Date.now();
  if (currentTime - mouseLastMoveTime < 14) return;
  mouseLastMoveTime = currentTime;
  gameTick.updatePlayerPosition(e.clientY);
});

const pixiRoot = createRoot(pixiApp.stage);
pixiRoot.render(<GameApp pixiApp={pixiApp} gameTick={gameTick} />);
