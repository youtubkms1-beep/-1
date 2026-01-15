const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const CONFIG = {
    GOOGLE_ID: "1065457238444-jo0k3dr5bj0th94qg7i54his9tg66l55.apps.googleusercontent.com",
    KAKAO_ID: "5989b66949eca05b1492411f9adf726b",
    GEMINI_KEY: "AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

// [버전 맞춤] 404 에러 방지를 위해 명시적으로 v1 또는 기본 설정을 사용
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
// gemini-1.5-flash는 현재 v1에서도 지원되므로 가장 안정적인 모델 경로를 선택합니다.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let authList = {}; 

// [1] 로그인 페이지 (구글 400 에러 해결을 위한 scope 보강)
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    // scope 파라미터에 openid profile email을 명확히 넣어 구글 보안 가이드를 맞춥니다.
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=openid%20email%20profile&state=google_${user_key}`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&state=kakao_${user_key}`;

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 행복한 우리집 인증</h2>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px;">
                <a href="${googleAuthUrl}" style="width: 220px; padding: 12px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">Google 로그인</a>
                <a href="${kakaoAuthUrl}" style="width: 220px; padding: 12px; background: #FEE500; border: none; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">카카오 로그인</a>
            </div>
        </div>
    `);
});

// [2] 인증 콜백
app.get('/auth/callback', (req, res) => {
    const { state } = req.query;
    if (state) {
        const [provider, user_key] = state.split('_');
        authList[user_key] = true;
        setTimeout(() => { delete authList[user_key]; }, 3600000); 
    }
    res.send("<script>alert('인증 성공!'); window.close();</script><h2>✅ 인증 완료! 카톡으로 돌아가세요.</h2>");
});

// [3] 카카오톡 응답
app.post('/kakao-auth', async (req, res) => {
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        // 인증 버튼 클릭 시 처리
        if (uttr.includes("인증") && authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "✅ 인증되었습니다! 이제 @나 #을 붙여 질문해주세요." } }] }
            });
        }

        // 미인증 유저 처리 (가이드 위반 방지용 썸네일 필수 포함)
        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "가족 인증이 필요합니다",
                            description: "로그인 후 [✅인증확인✅]을 눌러주세요.",
                            thumbnail: { imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png" },
                            buttons: [
                                { action: "webLink", label: "🔒로그인 하기", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                                { action: "message", label: "✅인증확인✅", messageText: "인증" }
                            ]
                        }
                    }]
                }
            });
        }

        // Gemini 대화 (버전 일치 및 404 방지)
        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
            
            // API 호출 (이 부분에서 버전 정보가 구글 서버로 전달됩니다)
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: text } }] }
            });
        }

        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "@ 또는 #을 붙여 질문해주세요!" } }] }
        });

    } catch (err) {
        console.error("Critical API Error:", err.message);
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "서버 연결에 실패했습니다. API 버전을 확인 중입니다." } }] }
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on ${PORT}`));
