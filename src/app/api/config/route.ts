import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULTS = {
    revealThreshold:         0.75,
    brushMin:                10,
    brushMax:                80,
    brushDefault:            40,
    audioVolume:             0.85,
    lineArtFadeDuration:     700,
    coloredFadeDuration:     900,
    glitterEnabled:          true,
    glitterDuration:         1100,
    // History replay gate
    historyTaskEnabled:      false,
    historyTaskType:         'watch_ad',
    historyTaskCreditCost:   30,
    historyTaskAffiliateUrl: 'https://www.canva.com',
};

function readConfig() {
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) }; }
    catch { return { ...DEFAULTS }; }
}

export async function GET() {
    return NextResponse.json(readConfig());
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const c = { ...readConfig(), ...body };

    // Numeric params
    c.revealThreshold     = Math.max(0.05, Math.min(1.0,   Number(c.revealThreshold)));
    c.brushMin            = Math.max(5,    Math.min(60,    Number(c.brushMin)));
    c.brushMax            = Math.max(20,   Math.min(200,   Number(c.brushMax)));
    c.brushDefault        = Math.max(c.brushMin, Math.min(c.brushMax, Number(c.brushDefault)));
    c.audioVolume         = Math.max(0,    Math.min(1.0,   Number(c.audioVolume)));
    c.lineArtFadeDuration = Math.max(0,    Math.min(3000,  Number(c.lineArtFadeDuration)));
    c.coloredFadeDuration = Math.max(0,    Math.min(3000,  Number(c.coloredFadeDuration)));
    c.glitterEnabled      = Boolean(c.glitterEnabled);
    c.glitterDuration     = Math.max(200,  Math.min(3000,  Number(c.glitterDuration)));

    // History task params
    c.historyTaskEnabled     = Boolean(c.historyTaskEnabled);
    c.historyTaskType        = ['watch_ad', 'click_affiliate', 'spend_credits'].includes(c.historyTaskType)
                               ? c.historyTaskType : 'watch_ad';
    c.historyTaskCreditCost  = Math.max(1, Math.min(1000, Number(c.historyTaskCreditCost)));
    c.historyTaskAffiliateUrl= typeof c.historyTaskAffiliateUrl === 'string' ? c.historyTaskAffiliateUrl : 'https://www.canva.com';

    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
    return NextResponse.json(c);
}
