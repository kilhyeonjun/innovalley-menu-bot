# ============================================
# 출력 값
# ============================================

output "instance_id" {
  description = "인스턴스 OCID"
  value       = oci_core_instance.menu_bot.id
}

output "instance_public_ip" {
  description = "인스턴스 공인 IP"
  value       = oci_core_instance.menu_bot.public_ip
}

output "instance_private_ip" {
  description = "인스턴스 사설 IP"
  value       = oci_core_instance.menu_bot.private_ip
}

output "vcn_id" {
  description = "VCN OCID"
  value       = oci_core_vcn.menu_bot_vcn.id
}

output "subnet_id" {
  description = "Subnet OCID"
  value       = oci_core_subnet.menu_bot_subnet.id
}

output "ssh_command" {
  description = "SSH 접속 명령어"
  value       = "ssh -i ${var.ssh_public_key_path} ubuntu@${oci_core_instance.menu_bot.public_ip}"
}

output "instance_shape" {
  description = "인스턴스 Shape"
  value       = "${var.instance_shape} (${var.instance_ocpus} OCPU, ${var.instance_memory_gb}GB RAM)"
}
