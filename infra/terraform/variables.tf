# ============================================
# OCI 인증 정보
# ============================================
variable "tenancy_ocid" {
  description = "OCI Tenancy OCID"
  type        = string
}

variable "user_ocid" {
  description = "OCI User OCID"
  type        = string
}

variable "fingerprint" {
  description = "API Key fingerprint"
  type        = string
}

variable "private_key_path" {
  description = "Path to OCI API private key"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI Region"
  type        = string
  default     = "ap-seoul-1" # 서울 리전
}

variable "compartment_ocid" {
  description = "Compartment OCID (기본: tenancy)"
  type        = string
  default     = ""
}

# ============================================
# 인스턴스 설정
# ============================================
variable "instance_name" {
  description = "VM 인스턴스 이름"
  type        = string
  default     = "menu-bot"
}

variable "instance_shape" {
  description = "VM Shape (ARM A1 추천)"
  type        = string
  default     = "VM.Standard.A1.Flex" # Always Free ARM
}

variable "instance_ocpus" {
  description = "OCPU 수 (최대 4)"
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "메모리 GB (최대 24)"
  type        = number
  default     = 12
}

variable "boot_volume_size_gb" {
  description = "부트 볼륨 크기 GB"
  type        = number
  default     = 50
}

# ============================================
# 네트워크 설정
# ============================================
variable "vcn_cidr" {
  description = "VCN CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "Subnet CIDR 블록"
  type        = string
  default     = "10.0.1.0/24"
}

# ============================================
# SSH 설정
# ============================================
variable "ssh_public_key_path" {
  description = "SSH 공개키 경로"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

# ============================================
# OS 이미지
# ============================================
variable "os_image" {
  description = "OS 이미지 (Ubuntu 22.04 ARM)"
  type        = string
  default     = "Canonical Ubuntu"
}

variable "os_version" {
  description = "OS 버전"
  type        = string
  default     = "22.04"
}
