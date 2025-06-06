import { NextRequest, NextResponse } from 'next/server';
import { getStorageStats } from '@/src/lib/storageManager';

export async function GET(request: NextRequest) {
  try {
    const stats = await getStorageStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 