export type CurrentUser = {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return {
    id: 'dev-user',
    email: 'dev-user@local.learning-agent',
  }
}
