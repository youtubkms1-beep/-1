app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const isFamily = authList[userKey];

    if (isFamily) {
        // [인증 완료 시]
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: { text: "✅ 인증이 이미 완료되었습니다! 이제 가족 메뉴를 이용하세요." }
                }]
            }
        });
    } else {
        // [인증 전 - 카드 형식] 
        // 카카오는 BasicCard에 반드시 이미지가 필요합니다.
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "아래 버튼으로 로그인을 완료한 후 '인증 완료 확인'을 눌러주세요.",
                        thumbnail: {
                            // 임시 보안 이미지 (카카오 정책 준수용)
                            imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png"
                        },
                        buttons: [
                            {
                                action: "webLink",
                                label: "🔒 1. 로그인하러 가기",
                                webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}`
                            },
                            {
                                action: "message",
                                label: "🔄 2. 인증 완료 확인",
                                messageText: "인증" 
                            }
                        ]
                    }
                }]
            }
        });
    }
});
