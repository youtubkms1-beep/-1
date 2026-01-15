app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const isFamily = authList[userKey];

    if (isFamily) {
        // 이미 인증된 경우
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: { text: "✅ 이미 인증된 가족입니다! 즐거운 시간 되세요." }
                }]
            }
        });
    } else {
        // 아직 인증 안 된 경우 (버튼 포함)
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "아래 버튼을 눌러 로그인을 완료한 후 다시 시도해주세요.",
                        buttons: [
                            {
                                action: "webLink",
                                label: "🔒 로그인하러 가기",
                                // 알려주신 주소를 적용했습니다.
                                webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}`
                            }
                        ]
                    }
                }]
            }
        });
    }
});
