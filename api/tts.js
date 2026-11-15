export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    try {
        const { apiKey, text, model, referenceId, speed } = req.body;

        if (!apiKey || !text) {
            return res.status(400).json({ error: '缺少必要的 API Key 或文字內容' });
        }

        // 呼叫 Fish Audio API (使用 Node.js 內建 fetch)
        const fishResponse = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'model': model || 's2.1-pro-free'
            },
            body: JSON.stringify({
                text: text,
                reference_id: referenceId ? referenceId.trim() : undefined,
                format: 'mp3',
                prosody: speed ? { speed: parseFloat(speed) } : undefined
            })
        });

        if (!fishResponse.ok) {
            const errText = await fishResponse.text();
            return res.status(fishResponse.status).json({ error: `Fish Audio 錯誤: ${errText}` });
        }

        // 設定串流回應標頭
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 將 Fish Audio 的資料流即時轉發給前端
        const reader = fishResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: '伺服器發生例外錯誤: ' + err.message });
        }
    }
}
