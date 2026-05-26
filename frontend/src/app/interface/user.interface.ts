/**
 * Represents a user entity in the system.
 *
 * @property {number} [id] - Unique database identifier for the user. Optional as it's assigned by the backend.
 * @property {string} name - User's first name.
 * @property {string} lastName - User's last name.
 * @property {string} userId - Unique username/identifier for login purposes.
 * @property {string} mail - User's email address for communication and authentication.
 * @property {string} password - User's hashed password for authentication.
 * @property {Company} [company] - Associated company information. Optional if user hasn't completed company details.
 */
export interface User {
  id?: number;
  name: string;
  lastName: string;
  userId: string;
  mail: string;
  password: string;
  company?: Company;
}

/**
 * Represents a company entity associated with a user.
 *
 * @property {number} [id] - Unique database identifier for the company. Optional as it's assigned by the backend.
 * @property {string} name - Official company name.
 * @property {string} size - Company size classification (e.g., 'small', 'medium', 'large', 'enterprise').
 * @property {string} sector - Industry sector or business category the company operates in.
 */
export interface Company {
  id?: number;
  name: string;
  size: string;
  sector: string;
}

/**
 * Represents the payload structure for user registration requests.
 * Encapsulates both user and company information in a single registration flow.
 *
 * @property {Object} user - User account information for registration.
 * @property {string} user.name - User's first name.
 * @property {string} user.lastName - User's last name.
 * @property {string} user.userId - Desired username/identifier for the account.
 * @property {string} user.mail - User's email address.
 * @property {string} user.password - User's chosen password (will be hashed by backend).
 * @property {Object} company - Company information associated with the user.
 * @property {string} company.name - Official company name.
 * @property {string} company.size - Company size classification.
 * @property {string} company.sector - Industry sector or business category.
 */
export interface RegistrationRequest {
  user: {
    name: string;
    lastName: string;
    userId: string;
    mail: string;
    password: string;
  };
  company: {
    name: string;
    size: string;
    sector: string;
  };
}

/**
 * Represents the payload structure for updating user profile data.
 *
 * @property {string} [name] - Updated user's first name.
 * @property {string} [lastName] - Updated user's last name.
 * @property {string} [userName] - Updated user's username/ID.
 * @property {string} [mail] - Updated user's email address.
 */
export interface UserUpdateData {
  name?: string;
  lastName?: string;
  userName?: string;
  mail?: string;
}

/**
 * Represents the payload structure for changing user password.
 *
 * @property {string} oldPassword - Current password for verification.
 * @property {string} newPassword - New password to be set.
 */
export interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
}

/**
 * Represents complete profile data including user and company information.
 * This is returned by the profile endpoint.
 *
 * @property {Object} user - User personal information.
 * @property {string} user.name - User's first name.
 * @property {string} user.lastName - User's last name.
 * @property {string} user.userName - User's username/ID for login.
 * @property {string} user.mail - User's email address.
 * @property {Object} company - Company information.
 * @property {string} company.name - Company name.
 * @property {string} company.size - Company size classification.
 * @property {string} company.sector - Company sector.
 */
export interface ProfileData {
  user: {
    name: string;
    lastName: string;
    userName: string;
    mail: string;
  };
  company: {
    name: string;
    size: string;
    sector: string;
  };
}
