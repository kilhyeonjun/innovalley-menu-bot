# ============================================
# Availability Domain
# ============================================
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# ============================================
# Ubuntu ARM 이미지 조회
# ============================================
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = local.compartment_ocid
  operating_system         = var.os_image
  operating_system_version = var.os_version
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ============================================
# SSH 공개키 로드
# ============================================
data "local_file" "ssh_public_key" {
  filename = pathexpand(var.ssh_public_key_path)
}
