export type GoogleSigninResponse = {
    sub: string,
    name: string,
    given_name: string,
    picture: string,
    email: string,
    email_verified: boolean
}

export type AuthResponse = {
    userId: string,
    accessToken: string
}
