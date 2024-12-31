const audioSelector = document.querySelector('audio');
const audioBtn: HTMLElement | null = document.querySelector('.audio-btn');
audioBtn!.style.opacity = audioSelector!.muted ? '0.5' : '1';
const toggleAudio = () => {
    if (audioSelector && audioBtn) {
        audioSelector.muted = !audioSelector.muted;
        audioSelector.play();
        audioBtn.style.opacity = audioSelector.muted ? '0.5' : '1';
    }
}