const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
const width = canvas!.width = window.innerWidth;
const height = canvas!.height = window.innerHeight;
const ctx = canvas!.getContext('2d')!;
const vector = (x: number, y: number) => ({ x, y });
const addVectors = (a: { x: number; y: number; }, b: { x: number; y: number; }) => ({ x: a.x + b.x, y: a.y + b.y });
const agents: { pos: { x: number; y: number; }; vel: { x: number; y: number; }; }[] = Array.from({ length: 1000 }, () => ({
    pos: vector(Math.random() * width, Math.random() * height),
    vel: vector(Math.random() * 4 - 2, Math.random() * 4 - 2)
}));
const animate = () => {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);
    agents.forEach((agent) => {
        let avgVel = vector(0, 0), center = vector(0, 0), separate = vector(0, 0), friends = 0;
        agents.forEach((other) => {
            if (agent === other) return;
            const distance = Math.sqrt((agent.pos.x - other.pos.x) ** 2 + (agent.pos.y - other.pos.y) ** 2);
            if (distance < 50) { // Vision radius
                avgVel = addVectors(avgVel, other.vel);
                center = addVectors(center, other.pos);
                if (distance < 25) separate = addVectors(separate, vector((agent.pos.x - other.pos.x) / distance,(agent.pos.y - other.pos.y) / distance));
                friends++;
            }
        });
        if (friends > 0) {
            avgVel = vector(avgVel.x / friends, avgVel.y / friends);
            agent.vel = vector(agent.vel.x + (avgVel.x - agent.vel.x) * 0.05, agent.vel.y + (avgVel.y - agent.vel.y) * 0.05);
            center = vector(center.x / friends, center.y / friends);
            agent.vel = vector(agent.vel.x + (center.x - agent.pos.x) * 0.0005, agent.vel.y + (center.y - agent.pos.y) * 0.0005);
            agent.vel = addVectors(agent.vel, vector(separate.x * 0.05, separate.y * 0.05));
        }
        const speed = Math.sqrt(agent.vel.x ** 2 + agent.vel.y ** 2);
        if (speed > 5) agent.vel = vector((agent.vel.x / speed) * 5, (agent.vel.y / speed) * 5);
        agent.pos = addVectors(agent.pos, agent.vel);
        if (agent.pos.x > width || agent.pos.x < 0) agent.vel.x = -agent.vel.x;
        if (agent.pos.y > height || agent.pos.y < 0) agent.vel.y = -agent.vel.y;
        ctx.fillStyle = 'white';
        ctx.fillRect(agent.pos.x, agent.pos.y, 6, 6);
    });
}
animate();