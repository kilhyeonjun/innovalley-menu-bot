# ============================================
# Compute Instance (ARM A1 Flex)
# ============================================
resource "oci_core_instance" "menu_bot" {
  compartment_id      = local.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  shape               = var.instance_shape
  display_name        = var.instance_name

  # ARM Flex Shape 설정
  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  # 소스 이미지
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_gb
  }

  # 네트워크 설정
  create_vnic_details {
    subnet_id        = oci_core_subnet.menu_bot_subnet.id
    assign_public_ip = true
    display_name     = "${var.instance_name}-vnic"
    hostname_label   = "menubot"
  }

  # SSH 키
  metadata = {
    ssh_authorized_keys = data.local_file.ssh_public_key.content
    user_data = base64encode(<<-EOF
      #!/bin/bash
      # Cloud-init 스크립트

      # 시스템 업데이트
      apt-get update && apt-get upgrade -y

      # Node.js 20 설치
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs

      # PM2 전역 설치
      npm install -g pm2

      # Git 설치
      apt-get install -y git

      # Playwright 의존성 설치
      npx playwright install-deps chromium

      # 방화벽 설정 (iptables)
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22 -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
      iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
      netfilter-persistent save

      # 완료 표시
      touch /home/ubuntu/.cloud-init-complete
    EOF
    )
  }

  # Free Tier 태그
  freeform_tags = {
    "Project"     = "menu-bot"
    "Environment" = "production"
    "ManagedBy"   = "terraform"
  }

  # 인스턴스가 항상 실행되도록
  preserve_boot_volume = false
}
