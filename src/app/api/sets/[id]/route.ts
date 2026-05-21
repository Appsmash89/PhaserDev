import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ColorSet } from '../route';

const DB_PATH  = path.join(process.cwd(), 'data', 'sets.json');
const SETS_DIR = path.join(process.cwd(), 'public', 'uploads', 'sets');

function readDB(): ColorSet[] {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
    catch { return []; }
}
function writeDB(data: ColorSet[]) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// DELETE /api/sets/[id] — delete the entire set
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const sets = readDB();
    const idx  = sets.findIndex(s => s.id === id);
    if (idx === -1) {
        return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    // Remove the entire set folder
    const setDir = path.join(SETS_DIR, id);
    try {
        fs.rmSync(setDir, { recursive: true, force: true });
    } catch {
        console.warn(`Could not remove folder ${setDir}`);
    }

    sets.splice(idx, 1);
    writeDB(sets);
    return NextResponse.json({ success: true });
}

// PATCH /api/sets/[id] — replace or delete a single asset
// To DELETE an asset:    body = { assetType: 'audio' }    (multipart or JSON)
// To REPLACE an asset:   body = multipart with field `file` + `assetType`
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const sets = readDB();
    const set  = sets.find(s => s.id === id);
    if (!set) {
        return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    const setDir = path.join(SETS_DIR, id);

    // ── JSON body: { assetType } means delete that asset ──────────────────
    if (contentType.includes('application/json')) {
        const { assetType } = await request.json() as { assetType: string };
        const urlKey = assetTypeToKey(assetType);
        if (!urlKey) return NextResponse.json({ error: 'Invalid assetType' }, { status: 400 });

        // Delete the file
        const currentUrl: string = (set as any)[urlKey] ?? '';
        if (currentUrl) {
            const filePath = path.join(process.cwd(), 'public', currentUrl);
            try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }

        // Null the field in DB
        (set as any)[urlKey] = null;
        writeDB(sets);
        return NextResponse.json(set);
    }

    // ── Multipart body: replace a single asset with a new file ──────────
    if (contentType.includes('multipart/form-data')) {
        const formData  = await request.formData();
        const assetType = formData.get('assetType') as string | null;
        const file      = formData.get('file') as File | null;

        if (!assetType || !file) {
            return NextResponse.json({ error: 'assetType and file are required' }, { status: 400 });
        }

        const urlKey = assetTypeToKey(assetType);
        if (!urlKey) return NextResponse.json({ error: 'Invalid assetType' }, { status: 400 });

        // Delete old file
        const oldUrl: string = (set as any)[urlKey] ?? '';
        if (oldUrl) {
            try { fs.unlinkSync(path.join(process.cwd(), 'public', oldUrl)); } catch { /* ignore */ }
        }

        // Save new file
        fs.mkdirSync(setDir, { recursive: true });
        const ext      = file.name.split('.').pop() || 'bin';
        const baseName = assetType === 'lineArt' ? 'lineart'
                       : assetType === 'coloredArt' ? 'colored'
                       : assetType;
        const filename = `${baseName}.${ext}`;
        const buffer   = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(setDir, filename), buffer);

        (set as any)[urlKey] = `/uploads/sets/${id}/${filename}`;
        writeDB(sets);
        return NextResponse.json(set);
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
}

function assetTypeToKey(assetType: string): keyof ColorSet | null {
    const map: Record<string, keyof ColorSet> = {
        lineArt:    'lineArtUrl',
        coloredArt: 'coloredArtUrl',
        audio:      'audioUrl',
        video:      'videoUrl',
    };
    return map[assetType] ?? null;
}
