const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(express.json());

// 1. 설정 (보내주신 키와 정보 적용)
const CONFIG = {
    GOOGLE: { 
        id: "454352830368-03qq6p3sp2md488cakspnj2nltpa8e6t.apps.googleusercontent.com",
        secret: "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"
    },
    KAKAO: { 
        id: "5989b66949eca05b1492411f9adf726b",
        secret: "A3RQH7OTnBGqpijRKVvIdlnpBpKHD2rV"
    },
    GEMINI_KEY: "AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let authList = {}; // 인증된 유저 저장 (메모리 방식)

// [경로 1] 로그인 페이지 (접속 문제 해결을 위해 최상단에 배치)
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    if (!user_key) return res.status(400).send("잘못된 접근입니다. 카카오톡에서 버튼을 눌러주세요.");

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2 style="color: #333;">🏠 행복한 우리집 인증</h2>
            <p style="color: #666;">로그인 후 10분간 이용이 가능합니다.</p>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px;">
                <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE.id}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=email profile&state=google_${user_key}" 
                   style="width: 240px; padding: 15px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">Google 로그인</a>
                
                <a href="https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO.id}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&state=kakao_${user_key}" 
                   style="width: 240px; padding: 15px; background: #FEE500; border: none; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">카카오 로그인</a>
            </div>
        </div>
    `);
});

// [경로 2] 통합 콜백 처리
app.get('/auth/callback', (req, res) => {
    const { state } = req.query;
    if (!state) return res.send("인증 정보가 없습니다.");
    
    const [provider, user_key] = state.split('_');

    authList[user_key] = true;
    setTimeout(() => { delete authList[user_key]; }, 600000); // 10분 후 만료

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2 style="color: #2e7d32;">✅ 인증 성공!</h2>
            <p>가족 인증이 확인되었습니다. (10분 유지)</p>
            <p>이제 카톡으로 돌아가서 <strong>'✅인증확인✅'</strong>을 누르세요.</p>
        </div>
    `);
});

// [경로 3] 카카오톡 챗봇 응답 및 Gemini 연동
app.post('/kakao-auth', async (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const uttr = req.body.userRequest.utterance;

    // 1. 인증 체크
    if (!authList[userKey]) {
        return res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "행복한 우리집 인증",
                        description: "로그인 후 10분간 이용이 가능합니다.",
                        thumbnail: { imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png" },
                        buttons: [
                            { action: "webLink", label: "🔒로그인 하기🔒", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                            { action: "message", label: "✅인증확인✅", messageText: "인증" }
                        ]
                    }
                }]
            }
        });
    }

    // 2. 인증된 유저가 @ 또는 #으로 말할 때 Gemini 작동
    if (uttr.startsWith('@') || uttr.startsWith('#')) {
        try {
            const question = uttr.replace(/^[@#]/, "").trim();
            const prompt = `당신은 '행복한 우리집'의 친절한 AI 비서입니다. 답변 끝에 ' - 우리집 비서 제미나이'라고 붙여주세요. 질문: ${question}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            return res.json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: response.text() } }] }
            });
        } catch (e) {
            return res.json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "잠시 오류가 발생했습니다. 다시 시도해 주세요." } }] }
            });
        }
    }

    // 3. 기호 없이 말한 경우 가이드
    res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "AI와 대화하려면 @ 또는 #을 앞에 붙여주세요!" } }] }
    });
});

// [핵심] Render 포트 바인딩 해결 코드
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 서버가 포트 ${PORT}에서 정상 가동 중입니다.`);
});
