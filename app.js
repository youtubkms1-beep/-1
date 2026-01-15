const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const CONFIG = {
    GOOGLE_ID: "1065457238444-jo0k3dr5bj0th94qg7i54his9tg66l55.apps.googleusercontent.com",
    GEMINI_KEY: "AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 인증 정보를 저장할 변수
let authList = {}; 

// [1] 로그인 페이지
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    res.send(`
        <div style="text-align: center; margin-top: 50px;">
            <h2>🏠 행복한 우리집 인증</h2>
            <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=email profile&state=google_${user_key}" 
               style="display: inline-block; padding: 15px 30px; background: #4285F4; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Google 로그인</a>
        </div>
    `);
});

// [2] 인증 콜백
app.get('/auth/callback', (req, res) => {
    const { state } = req.query;
    if (state) {
        const [provider, user_key] = state.split('_');
        authList[user_key] = true;
        // 1시간 동안 인증 유지
        setTimeout(() => { delete authList[user_key]; }, 3600000);
    }
    res.send("<script>alert('인증 성공! 카톡으로 돌아가세요.'); window.close();</script><h2>✅ 인증 완료!</h2>");
});

// [3] 카카오톡 챗봇 (타임아웃 방지 최적화)
app.post('/kakao-auth', async (req, res) => {
    console.log("===> 카카오 신호 포착!");
    
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        // 1. 인증 안 된 경우 (즉시 응답)
        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "인증이 필요합니다",
                            description: "가족만 이용 가능합니다.",
                            buttons: [{ action: "webLink", label: "🔒로그인 하기", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` }]
                        }
                    }]
                }
            });
        }

        // 2. Gemini 대화 (타임아웃 주의)
        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
            
            // Gemini 호출 (최대한 빨리 처리)
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text().substring(0, 500); // 카카오 글자수 제한 고려

            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: text } }] }
            });
        }

        // 3. 기타 질문
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "@ 또는 #을 붙여서 질문해주세요!" } }] }
        });

    } catch (err) {
        console.error("에러 내용:", err);
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "서버가 잠시 바빠요. 다시 한 번 말해주세요!" } }] }
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
