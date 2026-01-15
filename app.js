app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const isFamily = authList[userKey];

    if (isFamily) {
        // [경우 1] 인증이 완료된 경우
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: { text: "✅ 인증이 이미 완료되었습니다! 이제 가족 전용 메뉴를 이용하실 수 있습니다." }
                }]
            }
        });
    } else {
        // [경우 2] 아직 인증 전인 경우 (로그인 버튼 + 확인 버튼 포함)
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "1. 아래 버튼으로 로그인을 완료하신 후\n2. '인증 확인' 버튼을 다시 눌러주세요.",
                        buttons: [
                            {
                                action: "webLink",
                                label: "🔒 1. 로그인하러 가기",
                                webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}`
                            },
                            {
                                action: "message",
                                label: "🔄 2. 인증 완료 확인",
                                messageText: "인증" // 이 단어를 입력했을 때 다시 이 시나리오가 실행됩니다.
                            }
                        ]
                    }
                }]
            }
        });
    }
});
