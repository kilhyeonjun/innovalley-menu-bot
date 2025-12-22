# Oracle Cloud Infrastructure Terraform

냠냠위듀 봇을 Oracle Cloud Free Tier에 배포하기 위한 Terraform 구성입니다.

## 사전 준비

### 1. Oracle Cloud 계정

1. [Oracle Cloud](https://www.oracle.com/cloud/free/) 가입
2. Home Region 선택 (서울 `ap-seoul-1` 권장)
3. **PAYG 업그레이드 권장** (유휴 인스턴스 회수 방지)

### 2. OCI CLI 설치 및 설정

```bash
# macOS
brew install oci-cli

# 또는 공식 설치
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# 설정
oci setup config
```

### 3. API Key 생성

Oracle Cloud Console에서:

```
Profile → API Keys → Add API Key → Generate API Key Pair
```

다운로드한 Private Key를 `~/.oci/oci_api_key.pem`에 저장

### 4. Terraform 설치

```bash
# macOS
brew install terraform

# 버전 확인
terraform version
```

## 사용법

### 1. 변수 파일 생성

```bash
cp terraform.tfvars.example terraform.tfvars
```

### 2. terraform.tfvars 편집

Oracle Cloud Console에서 필요한 OCID 확인:

| 항목 | 위치 |
|------|------|
| tenancy_ocid | Profile → Tenancy → OCID |
| user_ocid | Profile → My Profile → OCID |
| fingerprint | Profile → API Keys → Fingerprint |
| compartment_ocid | Identity → Compartments → OCID (선택) |

### 3. Terraform 실행

```bash
# 초기화
terraform init

# 계획 확인
terraform plan

# 적용
terraform apply

# 출력 확인
terraform output
```

### 4. SSH 접속

```bash
# Terraform 출력에서 명령어 확인
terraform output ssh_command

# 또는 직접
ssh -i ~/.ssh/id_rsa ubuntu@<PUBLIC_IP>
```

## Free Tier 리소스 한도

| 리소스 | 한도 |
|--------|------|
| ARM A1 | 4 OCPU, 24GB RAM |
| AMD Micro | 2개 × 1/8 OCPU, 1GB |
| Block Volume | 200GB 총량 |
| Outbound | 10TB/월 |

## 주의사항

### Out of Capacity 에러

ARM 인스턴스 생성 시 "Out of host capacity" 에러가 발생할 수 있습니다.

**해결 방법:**
1. 다른 Availability Domain 시도
2. OCPU/메모리를 낮춰서 시도 (1 OCPU, 6GB부터)
3. 다른 리전 시도 (us-phoenix-1 권장)
4. 시간을 두고 재시도

### 유휴 인스턴스 회수

7일간 CPU/Network/Memory 사용률 < 20% 시 회수 경고

**방지 방법:**
1. PAYG로 업그레이드 (과금 없음, 회수 정책 제외)
2. 봇이 정상 작동하면 회수 대상 아님

## 삭제

```bash
terraform destroy
```

## 파일 구조

```
infra/terraform/
├── versions.tf          # Terraform 버전
├── provider.tf          # OCI Provider 설정
├── variables.tf         # 변수 정의
├── terraform.tfvars     # 변수 값 (Git 제외)
├── data.tf              # 데이터 소스
├── network.tf           # VCN, Subnet, Security
├── compute.tf           # VM 인스턴스
├── outputs.tf           # 출력 값
└── README.md
```

## 참고

- [OCI Terraform Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Oracle Cloud Free Tier](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm)
- [Terraform Examples](https://github.com/oracle/terraform-examples)
