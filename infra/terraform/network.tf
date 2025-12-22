# ============================================
# VCN (Virtual Cloud Network)
# ============================================
resource "oci_core_vcn" "menu_bot_vcn" {
  compartment_id = local.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.instance_name}-vcn"
  dns_label      = "menubotvcn"
}

# ============================================
# Internet Gateway
# ============================================
resource "oci_core_internet_gateway" "menu_bot_igw" {
  compartment_id = local.compartment_ocid
  vcn_id         = oci_core_vcn.menu_bot_vcn.id
  display_name   = "${var.instance_name}-igw"
  enabled        = true
}

# ============================================
# Route Table
# ============================================
resource "oci_core_route_table" "menu_bot_rt" {
  compartment_id = local.compartment_ocid
  vcn_id         = oci_core_vcn.menu_bot_vcn.id
  display_name   = "${var.instance_name}-rt"

  route_rules {
    network_entity_id = oci_core_internet_gateway.menu_bot_igw.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

# ============================================
# Security List
# ============================================
resource "oci_core_security_list" "menu_bot_sl" {
  compartment_id = local.compartment_ocid
  vcn_id         = oci_core_vcn.menu_bot_vcn.id
  display_name   = "${var.instance_name}-sl"

  # Egress: 모든 아웃바운드 허용
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
    stateless   = false
  }

  # Ingress: SSH (22)
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    stateless   = false
    description = "SSH"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # Ingress: HTTP (80) - 선택사항
  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    stateless   = false
    description = "HTTP"

    tcp_options {
      min = 80
      max = 80
    }
  }

  # Ingress: HTTPS (443) - 선택사항
  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    stateless   = false
    description = "HTTPS"

    tcp_options {
      min = 443
      max = 443
    }
  }

  # Ingress: App Port (3000) - Socket Mode 사용 시 불필요
  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    stateless   = false
    description = "App"

    tcp_options {
      min = 3000
      max = 3000
    }
  }

  # Ingress: ICMP (ping)
  ingress_security_rules {
    protocol    = "1" # ICMP
    source      = "0.0.0.0/0"
    stateless   = false
    description = "ICMP"

    icmp_options {
      type = 3
      code = 4
    }
  }
}

# ============================================
# Subnet
# ============================================
resource "oci_core_subnet" "menu_bot_subnet" {
  compartment_id             = local.compartment_ocid
  vcn_id                     = oci_core_vcn.menu_bot_vcn.id
  cidr_block                 = var.subnet_cidr
  display_name               = "${var.instance_name}-subnet"
  dns_label                  = "menubotsubnet"
  route_table_id             = oci_core_route_table.menu_bot_rt.id
  security_list_ids          = [oci_core_security_list.menu_bot_sl.id]
  prohibit_public_ip_on_vnic = false
}
