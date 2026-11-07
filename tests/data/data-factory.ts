export interface TestUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'staff' | 'customer' | 'guest';
}

export class DataFactory {
  public static generateEmail(prefix: string = 'tester'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}@example.com`;
  }

  public static generatePhone(): string {
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `09${random}`;
  }

  public static generateUser(role: 'admin' | 'staff' | 'customer' | 'guest' = 'customer'): TestUserPayload {
    const timestamp = Date.now().toString().slice(-4);
    const email = this.generateEmail(role);
    return {
      firstName: 'Nguyen',
      lastName: `Tester${timestamp}`,
      username: `${role}_${timestamp}`,
      email,
      phone: this.generatePhone(),
      password: 'StandardSecurePass@2026',
      role,
    };
  }

  public static generateBoundaryString(length: number = 255): string {
    return 'A'.repeat(length);
  }

  public static generateSpecialChars(): string {
    return 'Ṫëṡṫ Ứñïċöḋë 🌟 & < > " \' %00';
  }
}

