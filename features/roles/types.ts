export interface Permission {
  id:          string
  name:        string
  displayName: string
  module:      string
  description: string | null
}

export interface RolePermission {
  permission: Permission
}

export interface Role {
  id:              string
  name:            string
  displayName:     string
  description:     string | null
  isSystem:        boolean
  createdAt:       string
  updatedAt:       string
  rolePermissions: RolePermission[]
  _count?:         { userRoles: number }
}

export interface PermissionsByModule {
  [module: string]: Permission[]
}
