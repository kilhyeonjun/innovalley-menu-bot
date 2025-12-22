#!/bin/bash
# Oracle Cloud ARM 인스턴스 자동 재시도 스크립트
# 5분마다 terraform apply 시도, 성공 시 알림

cd "$(dirname "$0")"

MAX_ATTEMPTS=288  # 24시간 (5분 × 288)
INTERVAL=300      # 5분 (초)
ATTEMPT=0

echo "=========================================="
echo "Oracle Cloud ARM 인스턴스 자동 재시도"
echo "=========================================="
echo "리전: ap-chuncheon-1 (춘천)"
echo "Shape: VM.Standard.A1.Flex (1 OCPU, 6GB)"
echo "간격: ${INTERVAL}초 (5분)"
echo "최대 시도: ${MAX_ATTEMPTS}회 (24시간)"
echo "=========================================="
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$TIMESTAMP] 시도 #${ATTEMPT}/${MAX_ATTEMPTS}"

    # Terraform apply 실행
    OUTPUT=$(terraform apply -auto-approve 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "✅ 성공! 인스턴스가 생성되었습니다."
        echo "=========================================="
        echo ""
        terraform output

        # macOS 알림
        osascript -e 'display notification "Oracle Cloud VM 생성 완료!" with title "Terraform" sound name "Glass"'

        # 터미널 벨
        echo -e "\a"

        exit 0
    fi

    # Out of capacity 에러 확인
    if echo "$OUTPUT" | grep -q "Out of host capacity"; then
        echo "   ❌ Out of host capacity - ${INTERVAL}초 후 재시도..."
    else
        echo "   ❌ 다른 에러 발생:"
        echo "$OUTPUT" | tail -5
        echo ""
        echo "스크립트 중단. 에러를 확인하세요."
        exit 1
    fi

    # 대기
    sleep $INTERVAL
done

echo ""
echo "=========================================="
echo "❌ 최대 시도 횟수 초과 (${MAX_ATTEMPTS}회)"
echo "=========================================="
exit 1
