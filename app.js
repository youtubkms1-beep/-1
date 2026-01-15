const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();

app.use(express.json());

// 1. 설정 (보내주신 키 적용)
const genAI = new GoogleGenerativeAI("AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let authList = {}; // 인증 저장소

const CONFIG = {
    GOOGLE_ID: "454352830368-03qq6p3sp2md488cakspnj2nltpa8e6t.apps.googleusercontent.com",
    KAKAO_ID: "5989b66949eca05b1492411f9adf726b",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

// ... (생략: /login, /auth/callback 코드는 이전과 동일하게 유지) ...

// 3. 챗봇 엔진 (인증 체크 + 기호 호출 로직)
app.post('/kakao-auth', async (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const uttr = req.body.userRequest.utterance; // 사용자가 입력한 문구

    // [보안 1] 무조건 인증된 사용자만 허용 (인증 안 되면 답변 거부)
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

    // [로직 2] @ 또는 #으로 시작할 때만 Gemini 작동
    if (uttr.startsWith('@') || uttr.startsWith('#')) {
        try {
            // 기호(@, #)를 제거한 순수 질문 내용 추출
            const question = uttr.replace(/^[@#]/, "").trim();
            
            const prompt = `당신은 '행복한 우리집'의 인공지능 비서입니다. 가족들에게 친절하게 답변하세요. 질문: ${question}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return res.json({
                version: "2.0",
                template: {
                    outputs: [{ simpleText: { text: text } }]
                }
            });
        } catch (error) {
            return res.json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "죄송해요, AI 응답 처리 중 오류가 발생했어요." } }] }
            });
        }
    }

    // [로직 3] 기호 없이 말하면 아무 대답도 안 하거나 기본 시나리오로 넘김
    // 여기서는 아무런 응답을 주지 않아 카카오톡 기본 응답이 나가게 설정하거나, 
    // 아래처럼 가이드를 줄 수 있습니다.
    res.json({
        version: "2.0",
        template: {
            outputs: [{ simpleText: { text: "AI와 대화하시려면 문구 앞에 @ 또는 #을 붙여주세요! (예: @오늘 날씨 어때?)" } }]
        }
    });
});

app.listen(3000, () => console.log("Gemini 비서 가동 중..."));
