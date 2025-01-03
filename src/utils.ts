import { Texture } from "kansei";

const audioSelector = document.querySelector('audio');
const audioBtn: HTMLElement | null = document.querySelector('.audio-btn');
audioBtn!.style.opacity = audioSelector!.muted ? '0.5' : '1';
(window as any).toggleAudio = () => {
    if (audioSelector && audioBtn) {
        audioSelector.muted = !audioSelector.muted;
        audioSelector.play();
        audioBtn.style.opacity = audioSelector.muted ? '0.5' : '1';
    }
}

const infoContainer: HTMLElement | null = document.querySelector('.wrapper');
infoContainer!.style.transition = 'opacity 0.5s ease-in-out';
let timeoutId: number = 0;
timeoutId = setTimeout(() => {
    infoContainer!.style.opacity = '0';
}, 4000);
addEventListener('mousemove', (e) => {
    const y = e.clientY;
    if(y > window.innerHeight / 1.3) {
        infoContainer!.style.opacity = '1';
    }
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        infoContainer!.style.opacity = '0';
    }, 2000);
});