const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. 설정 및 API 키
const CONFIG = {
    GOOGLE_ID: "1065457238444-jo0k3dr5bj0th94qg7i54his9tg66l55.apps.googleusercontent.com",
    GEMINI_KEY: "AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let authList = {}; 

// [경로 1] 로그인 페이지
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    if (!user_key) return res.status(400).send("잘못된 접근입니다.");

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 행복한 우리집 인증</h2>
            <div style="margin-top: 30px;">
                <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=email profile&state=google_${user_key}" 
                   style="padding: 15px 30px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; font-weight: bold;">Google 로그인</a>
            </div>
        </div>
    `);
});

// [경로 2] 콜백 처리
app.get('/auth/callback', (req, res) => {
    const { state } = req.query;
    if (!state) return res.send("인증 실패");
    
    const [provider, user_key] = state.split('_');
    authList[user_key] = true;
    setTimeout(() => { delete authList[user_key]; }, 600000); // 10분 유지

    res.send("<div style='text-align:center; margin-top:50px;'><h2>✅ 인증 성공!</h2><p>카톡으로 돌아가서 '인증확인'을 누르세요.</p></div>");
});

// [경로 3] 카카오톡 챗봇 핵심 로직
app.post('/kakao-auth', async (req, res) => {
    // 로그를 남겨서 카카오가 들어오는지 확인
    console.log("===> 카카오로부터 요청이 들어왔습니다!"); 
    
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        // 1. 인증 체크
        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "가족 인증이 필요합니다",
                            description: "아래 버튼을 눌러 로그인을 해주세요.",
                            buttons: [
                                { action: "webLink", label: "🔒로그인 하기🔒", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                                { action: "message", label: "✅인증확인✅", messageText: "인증" }
                            ]
                        }
                    }]
                }
            });
        }

        // 2. Gemini 대화 (@ 또는 # 시작 시)
        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
            
            // 타임아웃 방지를 위해 Gemini 호출에 await 사용
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{ simpleText: { text: text } }]
                }
            });
        }

        // 3. 기본 응답
        return res.status(200).json({
            version: "2.0",
            template: {
                outputs: [{ simpleText: { text: "AI와 대화하려면 문장 앞에 @ 또는 #을 붙여주세요!" } }]
            }
        });

    } catch (error) {
        console.error("에러 발생:", error);
        return res.status(200).json({
            version: "2.0",
            template: {
                outputs: [{ simpleText: { text: "잠시 서버가 바쁘네요. 다시 말씀해 주세요!" } }]
            }
        });
    }
});

// [포트 설정] Render에서 가장 중요한 부분
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 준비되었습니다.`);
});
