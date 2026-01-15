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

// Gemini 설정 수정 (가장 안정적인 호출 방식)
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
// 에러 방지를 위해 모델명을 다시 정의합니다.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let authList = {}; 

// [1] 로그인 페이지 (카카오 버튼 포함)
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 행복한 우리집 인증</h2>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px;">
                <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=email profile&state=google_${user_key}" 
                   style="width: 200px; padding: 12px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">Google 로그인</a>
                
                <a href="https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&state=kakao_${user_key}" 
                   style="width: 200px; padding: 12px; background: #FEE500; border: none; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">카카오 로그인</a>
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
    res.send("<script>alert('인증 성공! 카톡에서 [인증확인]을 누르세요.'); window.close();</script>");
});

// [3] 카카오톡 응답
app.post('/kakao-auth', async (req, res) => {
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        // 인증 확인 로직
        if (uttr.includes("인증")) {
            if (authList[userKey]) {
                return res.status(200).json({
                    version: "2.0",
                    template: { outputs: [{ simpleText: { text: "✅ 인증이 완료되었습니다! 이제 대화를 시작하세요." } }] }
                });
            }
        }

        // 로그인 유도 카드 (Thumbnail 필수 추가로 가이드 위반 해결)
        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "가족 인증이 필요합니다",
                            description: "로그인 후 [인증확인] 버튼을 눌러주세요.",
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

        // Gemini 대화 호출 (에러 수정됨)
        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
            
            // 404 에러를 방지하기 위해 생성 방식 확인
            const result = await model.generateContent(question);
            const response = await result.response;
            
            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: response.text() } }] }
            });
        }

        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "@ 또는 #을 붙여 질문해주세요!" } }] }
        });

    } catch (err) {
        console.error("최종 에러 로그:", err);
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "죄송합니다, 잠시 대화 연결에 문제가 생겼어요. 다시 말씀해 주세요!" } }] }
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`서버 작동 중: ${PORT}`));
