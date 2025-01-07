interface Challenge {
    day: number;
    prompt: string;
    credit: string;
    completed: boolean;
    sketchUrl: string;
}

class GenuaryCalendar {
    private challenges: Challenge[] = [
        { day: 1, prompt: "Vertical or horizontal lines only", credit: "Stranger in the Q", completed: true, sketchUrl: "/sketches/day1.html" },
        { day: 2, prompt: "Layers upon layers upon layers", credit: "Monokai", completed: true, sketchUrl: "/sketches/day2.html" },
        { day: 3, prompt: "Exactly 42 lines of code", credit: "Roni Kaufman", completed: true, sketchUrl: "/sketches/day3.html" },
        { day: 4, prompt: "Black on black", credit: "Stranger in the Q", completed: true, sketchUrl: "/sketches/day4.html" },
        { day: 5, prompt: "Isometric Art - (No vanishing points)", credit: "P1xelboy", completed: false, sketchUrl: "/sketches/day5.html" },
        { day: 6, prompt: "Make a landscape using only primitive shapes", credit: "Jonathan Barbeau", completed: true, sketchUrl: "/sketches/day6.html" },
        { day: 7, prompt: "Use software that is not intended to create art or images", credit: "Camille Roux", completed: false, sketchUrl: "/sketches/day7.html" },
        { day: 8, prompt: "Draw one million of something", credit: "Piter Pasma", completed: false, sketchUrl: "/sketches/day8.html" },
        { day: 9, prompt: "The textile design patterns of public transport seating", credit: "Piter Pasma", completed: false, sketchUrl: "/sketches/day9.html" },
        { day: 10, prompt: "You can only use TAU in your code, no other number allowed", credit: "Darien Brito", completed: false, sketchUrl: "/sketches/day10.html" },
        { day: 11, prompt: "Impossible day - Try to do something that feels impossible for you to do", credit: "Rachel Ehrlich (Joy of Randomness) and the Recurse Center", completed: false, sketchUrl: "/sketches/day11.html" },
        { day: 12, prompt: "Subdivision", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day12.html" },
        { day: 13, prompt: "Triangles and nothing else", credit: "Heeey", completed: false, sketchUrl: "/sketches/day13.html" },
        { day: 14, prompt: "Pure black and white. No gray", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day14.html" },
        { day: 15, prompt: "Design a rug", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day15.html" },
        { day: 16, prompt: "Generative palette", credit: "Stranger in the Q", completed: false, sketchUrl: "/sketches/day16.html" },
        { day: 17, prompt: "What happens if pi=4?", credit: "Roni Kaufman", completed: false, sketchUrl: "/sketches/day17.html" },
        { day: 18, prompt: "What does wind look like?", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day18.html" },
        { day: 19, prompt: "Op Art", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day19.html" },
        { day: 20, prompt: "Generative Architecture", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day20.html" },
        { day: 21, prompt: "Create a collision detection system (no libraries allowed)", credit: "Darien Brito", completed: false, sketchUrl: "/sketches/day21.html" },
        { day: 22, prompt: "Gradients only", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day22.html" },
        { day: 23, prompt: "Inspired by brutalism", credit: "Melissa Wiederrecht, Roni Kaufman", completed: false, sketchUrl: "/sketches/day23.html" },
        { day: 24, prompt: "Geometric art - pick either a circle, rectangle, or triangle and use only that geometric shape", credit: "Bruce Holmer", completed: false, sketchUrl: "/sketches/day24.html" },
        { day: 25, prompt: "One line that may or may not intersect itself", credit: "Bruce Holmer, Chris Barber (code_rgb), Heeey, Monokai", completed: false, sketchUrl: "/sketches/day25.html" },
        { day: 26, prompt: "Symmetry", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day26.html" },
        { day: 27, prompt: "Make something interesting with no randomness or noise or trig", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day27.html" },
        { day: 28, prompt: "Infinite Scroll", credit: "Sophia (fractal kitty)", completed: false, sketchUrl: "/sketches/day28.html" },
        { day: 29, prompt: "Grid-based graphic design", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day29.html" },
        { day: 30, prompt: "Abstract map", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day30.html" },
        { day: 31, prompt: "Pixel sorting", credit: "Melissa Wiederrecht", completed: false, sketchUrl: "/sketches/day31.html" }
    ];

    constructor() {
        this.renderChallenges();
    }

    private renderChallenges(): void {
        const grid = document.getElementById('challengesGrid');
        if (!grid) return;

        this.challenges.forEach(challenge => {
            const card = this.createChallengeCard(challenge);
            grid.appendChild(card);
        });
    }

    private createChallengeCard(challenge: Challenge): HTMLElement {
        const card = document.createElement('a');
        card.href = challenge.sketchUrl;
        card.className = `challenge-card ${challenge.completed ? 'completed' : ''}`;
        
        card.innerHTML = `
            <h2 class="challenge-day">Day ${challenge.day}</h2>
            <p class="challenge-prompt">${challenge.prompt}</p>
            <p class="challenge-credit">prompt by ${challenge.credit}</p>
            <p class="challenge-status">${challenge.completed ? 'Completed' : 'Not started'}</p>
        `;

        return card;
    }
}

// Initialize the calendar
new GenuaryCalendar(); 