import path from "path";
import fs from "fs";

export async function GET(){
    try {
        const filePath = path.join(process.cwd(), 'data', 'games.json');
        const fileContents = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContents);

        return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error reading file:", error);
        return new Response(JSON.stringify({ error: 'Failed to load data' }), {
        status: 500
        });
    }
}