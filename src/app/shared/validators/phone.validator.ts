import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values
    }

    // Remove all non-digit characters
    const phoneNumber = control.value.replace(/\D/g, '');
    
    // Check if it's a valid phone number (10 digits for US format)
    const isValid = /^\d{10}$/.test(phoneNumber);

    return isValid ? null : { invalidPhone: { value: control.value } };
  };
}
