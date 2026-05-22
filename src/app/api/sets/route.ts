import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'sets.json');
const SETS_DIR = path.join(process.cwd(), 'public', 'uploads', 'sets');

export interface ColorSet {
    id: string;
    name: string;
    lineArtUrl: string | null;
    coloredArtUrl: string | null;
    audioUrl: string | null;
    videoUrl: string | null;
    createdAt: string;
    creditCost: number;
    genre:      string;  // e.g. "Portraits" | "Fantasy" | "Nature"
    videoMuted: boolean; // admin-controlled; true = video plays muted after reveal
}

function readDB(): ColorSet[] {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeDB(data: ColorSet[]) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function saveFile(file: File, dir: string, baseName: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${baseName}.${ext}`;
    const filePath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return filename;
}

// GET /api/sets — return all sets
export async function GET() {
    const sets = readDB();
    return NextResponse.json(sets);
}

// POST /api/sets — upload a new set with 4 assets
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const name       = (formData.get('name')       as string) || 'Untitled';
        const creditCost = parseInt((formData.get('creditCost') as string) ?? '0', 10) || 0;
        const genre      = (formData.get('genre')       as string) || 'General';
        const videoMuted = (formData.get('videoMuted')  as string) === 'true';
        const lineArt    = formData.get('lineArt')    as File | null;
        const coloredArt = formData.get('coloredArt') as File | null;
        const audio      = formData.get('audio')      as File | null;
        const video      = formData.get('video')      as File | null;

        if (!lineArt || !coloredArt || !audio || !video) {
            return NextResponse.json(
                { error: 'All 4 assets (lineArt, coloredArt, audio, video) are required.' },
                { status: 400 }
            );
        }

        const id = Date.now().toString();
        const setDir = path.join(SETS_DIR, id);
        fs.mkdirSync(setDir, { recursive: true });

        const [lineArtFile, coloredArtFile, audioFile, videoFile] = await Promise.all([
            saveFile(lineArt,    setDir, 'lineart'),
            saveFile(coloredArt, setDir, 'colored'),
            saveFile(audio,      setDir, 'audio'),
            saveFile(video,      setDir, 'video'),
        ]);

        const entry: ColorSet = {
            id, name,
            lineArtUrl:    `/uploads/sets/${id}/${lineArtFile}`,
            coloredArtUrl: `/uploads/sets/${id}/${coloredArtFile}`,
            audioUrl:      `/uploads/sets/${id}/${audioFile}`,
            videoUrl:      `/uploads/sets/${id}/${videoFile}`,
            createdAt:     new Date().toISOString(),
            creditCost,
            genre,
            videoMuted,
        };

        const sets = readDB();
        sets.push(entry);
        writeDB(sets);

        return NextResponse.json(entry, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Set upload error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
