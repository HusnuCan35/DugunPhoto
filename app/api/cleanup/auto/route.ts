import { NextRequest, NextResponse } from 'next/server';
import { checkAndPerformAutoBackupAndCleanup } from '@/src/lib/storageManager';

export async function POST(request: NextRequest) {
  try {
    const result = await checkAndPerformAutoBackupAndCleanup();
    if (result) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ success: true, message: 'Depolama alanı 900 MB altında, otomatik yedekleme gerekmedi.' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Otomatik yedekleme+temizlik API hatası: ' + (error as Error).message }, { status: 500 });
  }
} 