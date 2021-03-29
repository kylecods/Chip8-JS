import Keyboard from './keyboard.js';
import Renderer from './renderer.js';
import Speaker from './speaker.js';
import CPU from './cpu.js';

const renderer = new Renderer(12);
const keyboard = new Keyboard();
const speaker = new Speaker();
const cpu = new CPU(renderer, keyboard,speaker);

let loop;
let fps = 60, fpsInterval, startTime, now, then, elapsed;

function init(){
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;

    // //tests
    // renderer.testRender();
    // renderer.render();

    cpu.loadSpritesIntoMemory();
    cpu.loadRom('maze.rom');

    loop = requestAnimationFrame(step);
}

function step(){
    now = Date.now();
    elapsed = now - then;

    if(elapsed > fpsInterval){
        //cycle cpu
        cpu.cycle();
    }

    loop = requestAnimationFrame(step);
}

init();