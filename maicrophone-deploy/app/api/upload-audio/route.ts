import { NextRequest, NextResponse } from 'next/server';

import { AUDIO_BUCKET, supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const durationSeconds = formData.get('durationSeconds') as string | null;

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!userId) {
        return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }

    const recordingId = crypto.randomUUID();
    const ext = file.name.split('.').pop() ?? 'wav';
    const storagePath = `${userId}/${recordingId}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Insert DB row
    const { error: dbError } = await supabase.from('recordings').insert({
        user_id: userId,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        duration_seconds: durationSeconds ? parseFloat(durationSeconds) : null,
    });

    if (dbError) {
        console.error('Supabase DB insert error:', dbError);
        // File was uploaded but DB insert failed — not fatal for the user flow
    }

    return NextResponse.json({
        data: {
            recordingId,
            url: publicUrl,
            storagePath,
        },
    });
}
