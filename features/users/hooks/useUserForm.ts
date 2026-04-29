'use client'

import { useState } from 'react'
import { createUser, updateUser, deleteUser, updateUserRoles } from '../services/userService'
import { emptyUserForm } from '../types'
import type { ErpUser, UserFormData } from '../types'

export function useUserForm(onSuccess: () => void) {
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<ErpUser | null>(null)
  const [form, setForm]       = useState<UserFormData>(emptyUserForm)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm(emptyUserForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(user: ErpUser) {
    setEditing(user)
    setForm({
      email:     user.email,
      name:      user.name,
      password:  '',
      roleNames: user.userRoles.map(ur => ur.role.name),
    })
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    setForm(emptyUserForm)
    setError(null)
  }

  async function handleSubmit(roleIds: string[]) {
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateUser(editing.id, {
          name:     form.name,
          isActive: true,
          password: form.password || undefined,
        })
        await updateUserRoles(editing.id, roleIds)
      } else {
        const created = await createUser({ ...form, roleNames: form.roleNames })
        if (roleIds.length > 0) {
          await updateUserRoles(created.id, roleIds)
        }
      }
      onSuccess()
      close()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: ErpUser) {
    try {
      await updateUser(user.id, { isActive: !user.isActive })
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(user: ErpUser) {
    if (!confirm(`Opravdu smazat uživatele "${user.name}"?`)) return
    try {
      await deleteUser(user.id)
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return {
    open, editing, form, saving, error,
    setForm, openNew, openEdit, close,
    handleSubmit, handleToggleActive, handleDelete,
  }
}
