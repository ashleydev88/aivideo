import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/render', async (req: Request, res: Response) => {
    try {
        console.log("🚀 Received render request");
        const { course_id, slide_data, accent_color } = req.body;

        if (!course_id || !slide_data) {
            res.status(400).send("Missing course_id or slide_data");
            return;
        }

        // Temp location
        const outputLocation = path.join(process.cwd(), 'out', `course_${course_id}.mp4`);
        if (!fs.existsSync(path.dirname(outputLocation))) {
            fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
        }

        console.log(`   📦 Bundling...`);
        const bundled = await bundle({
            entryPoint: path.join(process.cwd(), 'src', 'remotion.tsx'),
            // If on Lambda you'd use a different approach, but for "Service" this works
            webpackOverride: (config) => config, // Optional: customize webpack
        });

        console.log(`   Detailed Composition Selection...`);
        const inputProps = {
            slide_data,
            accent_color: accent_color || '#14b8a6'
        };

        const composition = await selectComposition({
            serveUrl: bundled,
            id: 'Main',
            inputProps,
        });

        console.log(`   🎥 Rendering to ${outputLocation}...`);

        await renderMedia({
            composition,
            serveUrl: bundled,
            codec: 'h264',
            outputLocation,
            inputProps,
        });

        console.log("   ✅ Clean Render Complete");

        // In a real scenario, upload to S3 here. 
        // For now, return success and path (or serve it)
        res.json({ status: "success", path: outputLocation });

    } catch (e: any) {
        console.error("Render Error:", e);
        res.status(500).send(e.toString());
    }
});

app.listen(port, () => {
    console.log(`Remotion Renderer Interface listening on port ${port}`);
});
