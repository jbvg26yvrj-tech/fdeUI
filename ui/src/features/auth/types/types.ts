export interface AuthRequestDto {
  provider?: 'LOCAL' | 'LDAP';
  login: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}

export interface RegistrationRequestDto extends AuthRequestDto {
  confirmPassword: string;
}

export interface RegistrationResponseDto {
  user: UserDto;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface UserDto {
  authSource?: 'LOCAL' | 'LDAP';
  id: string;
  login: string;
  activated: boolean;
  passwordChangeRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  activated?: boolean;
  passwordChangeRequired?: boolean;
}

export interface CreateUserRequest {
  login: string;
  password: string;
  activated?: boolean;
}

export interface UsersQueryParams {
  page?: number;
  size?: number;
  sort?: string;
  login?: string;
}
