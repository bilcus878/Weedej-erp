export interface UserRole {
  role:       { id: string; name: string; displayName: string }
  assignedAt: string
}

export interface ErpUser {
  id:        string
  email:     string
  name:      string
  isActive:  boolean
  createdAt: string
  updatedAt: string
  userRoles: UserRole[]
}

export interface UserFormData {
  email:     string
  name:      string
  password:  string
  roleNames: string[]
}

export interface UserUpdateData {
  name?:     string
  isActive?: boolean
  password?: string
}

export const emptyUserForm: UserFormData = {
  email:     '',
  name:      '',
  password:  '',
  roleNames: [],
}
