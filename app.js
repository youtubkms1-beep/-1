app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id; // 사용자의 카카오 ID
    const isFamily = authList[userKey]; // 장부에서 인증 확인

    if (isFamily) {
        // [경우 1] 인증된 사람에게는 확인 메시지만 보냄
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: { text: "✅ 인증이 완료된 가족입니다. 자유롭게 이용하세요!" }
                }]
            }
        });
    } else {
        // [경우 2] 인증 안 된 사람에게는 '로그인 버튼'을 만들어서 보냄
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "아래 버튼을 눌러 로그인을 완료한 후 다시 확인해주세요.",
                        buttons: [
                            {
                                action: "webLink",
                                label: "🔒 로그인하러 가기",
                                webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` // 본인 Render 주소로 수정!
                            }
                        ]
                    }
                }]
            }
        });
    }
});

