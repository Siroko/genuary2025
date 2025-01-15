class CanvasText {
    public canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private renderMultilineText() {
        const lineHeight = this.fontSize * 0.8; // Add some spacing between lines
        const lines = this.text.split('\n');
        const totalHeight = lineHeight * lines.length;
        const startY = (this.canvas.height - totalHeight) / 2;

        lines.forEach((line, index) => {
            const y = startY + (lineHeight * index) + (lineHeight / 2);
            this.context.fillText(line, this.canvas.width / 2, y);
        });
    }

    constructor(
        public text: string, 
        public fontSize: number, 
        public fontFamily: string
    ) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 4096;
        this.canvas.height = 2048;
        this.context = this.canvas.getContext('2d')!;
        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.font = `${this.fontSize}px ${this.fontFamily}`;
        this.context.fillStyle = 'gray';
        this.context.textAlign = 'center';
        this.context.letterSpacing = '-15px';
        this.context.textBaseline = 'middle';
        
        this.renderMultilineText();
    }

    update() {
        this.context.fillStyle = 'white';
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'gray';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        
        this.renderMultilineText();
    }
}

export default CanvasText;
