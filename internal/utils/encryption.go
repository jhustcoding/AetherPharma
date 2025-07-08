package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
)

var encryptionKey []byte

// InitializeEncryption sets up the encryption key
func InitializeEncryption(key string) error {
	if len(key) != 32 {
		return fmt.Errorf("encryption key must be exactly 32 characters long")
	}
	
	// Use SHA256 to ensure we have a proper 32-byte key
	hash := sha256.Sum256([]byte(key))
	encryptionKey = hash[:]
	return nil
}

// EncryptedString represents an encrypted string field
type EncryptedString struct {
	value     string
	encrypted string
}

// NewEncryptedString creates a new encrypted string
func NewEncryptedString(value string) *EncryptedString {
	return &EncryptedString{value: value}
}

// Set the value and encrypt it
func (es *EncryptedString) Set(value string) error {
	es.value = value
	if value == "" {
		es.encrypted = ""
		return nil
	}
	
	encrypted, err := Encrypt(value)
	if err != nil {
		return err
	}
	es.encrypted = encrypted
	return nil
}

// Get returns the decrypted value
func (es *EncryptedString) Get() (string, error) {
	if es.encrypted == "" {
		return "", nil
	}
	
	if es.value != "" {
		return es.value, nil
	}
	
	decrypted, err := Decrypt(es.encrypted)
	if err != nil {
		return "", err
	}
	es.value = decrypted
	return decrypted, nil
}

// String returns the decrypted value for display
func (es *EncryptedString) String() string {
	value, _ := es.Get()
	return value
}

// Scan implements the sql.Scanner interface
func (es *EncryptedString) Scan(value interface{}) error {
	if value == nil {
		es.encrypted = ""
		es.value = ""
		return nil
	}

	switch v := value.(type) {
	case string:
		es.encrypted = v
		es.value = "" // Clear cached value
	case []byte:
		es.encrypted = string(v)
		es.value = "" // Clear cached value
	default:
		return fmt.Errorf("cannot scan %T into EncryptedString", value)
	}

	return nil
}

// Value implements the driver.Valuer interface
func (es EncryptedString) Value() (driver.Value, error) {
	if es.value != "" && es.encrypted == "" {
		// Need to encrypt the value
		encrypted, err := Encrypt(es.value)
		if err != nil {
			return nil, err
		}
		return encrypted, nil
	}
	return es.encrypted, nil
}

// MarshalJSON for JSON serialization
func (es *EncryptedString) MarshalJSON() ([]byte, error) {
	value, err := es.Get()
	if err != nil {
		return nil, err
	}
	return json.Marshal(value)
}

// UnmarshalJSON for JSON deserialization
func (es *EncryptedString) UnmarshalJSON(data []byte) error {
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	return es.Set(value)
}

// EncryptedStringArray represents an encrypted array of strings
type EncryptedStringArray struct {
	value     []string
	encrypted string
}

// NewEncryptedStringArray creates a new encrypted string array
func NewEncryptedStringArray(value []string) *EncryptedStringArray {
	return &EncryptedStringArray{value: value}
}

// Set the value and encrypt it
func (esa *EncryptedStringArray) Set(value []string) error {
	esa.value = value
	if len(value) == 0 {
		esa.encrypted = ""
		return nil
	}
	
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return err
	}
	
	encrypted, err := Encrypt(string(jsonBytes))
	if err != nil {
		return err
	}
	esa.encrypted = encrypted
	return nil
}

// Get returns the decrypted value
func (esa *EncryptedStringArray) Get() ([]string, error) {
	if esa.encrypted == "" {
		return []string{}, nil
	}
	
	if esa.value != nil {
		return esa.value, nil
	}
	
	decrypted, err := Decrypt(esa.encrypted)
	if err != nil {
		return nil, err
	}
	
	var value []string
	if err := json.Unmarshal([]byte(decrypted), &value); err != nil {
		return nil, err
	}
	
	esa.value = value
	return value, nil
}

// Scan implements the sql.Scanner interface
func (esa *EncryptedStringArray) Scan(value interface{}) error {
	if value == nil {
		esa.encrypted = ""
		esa.value = nil
		return nil
	}

	switch v := value.(type) {
	case string:
		esa.encrypted = v
		esa.value = nil // Clear cached value
	case []byte:
		esa.encrypted = string(v)
		esa.value = nil // Clear cached value
	default:
		return fmt.Errorf("cannot scan %T into EncryptedStringArray", value)
	}

	return nil
}

// Value implements the driver.Valuer interface
func (esa EncryptedStringArray) Value() (driver.Value, error) {
	if esa.value != nil && esa.encrypted == "" {
		// Need to encrypt the value
		jsonBytes, err := json.Marshal(esa.value)
		if err != nil {
			return nil, err
		}
		
		encrypted, err := Encrypt(string(jsonBytes))
		if err != nil {
			return nil, err
		}
		return encrypted, nil
	}
	return esa.encrypted, nil
}

// MarshalJSON for JSON serialization
func (esa *EncryptedStringArray) MarshalJSON() ([]byte, error) {
	value, err := esa.Get()
	if err != nil {
		return nil, err
	}
	return json.Marshal(value)
}

// UnmarshalJSON for JSON deserialization
func (esa *EncryptedStringArray) UnmarshalJSON(data []byte) error {
	var value []string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	return esa.Set(value)
}

// Encrypt encrypts a string using AES-256-GCM
func Encrypt(plaintext string) (string, error) {
	if encryptionKey == nil {
		return "", fmt.Errorf("encryption key not initialized")
	}
	
	if plaintext == "" {
		return "", nil
	}

	// Create AES cipher
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Create nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt the data
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a string using AES-256-GCM
func Decrypt(ciphertext string) (string, error) {
	if encryptionKey == nil {
		return "", fmt.Errorf("encryption key not initialized")
	}
	
	if ciphertext == "" {
		return "", nil
	}

	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	// Create AES cipher
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Extract nonce
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, cipherData := data[:nonceSize], data[nonceSize:]

	// Decrypt the data
	plaintext, err := gcm.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// HashPassword creates a secure hash of a password
func HashPassword(password string) (string, error) {
	// This would typically use bcrypt, but for simplicity using a basic hash
	// In production, use: golang.org/x/crypto/bcrypt
	hash := sha256.Sum256([]byte(password + "pharmacy_salt"))
	return base64.StdEncoding.EncodeToString(hash[:]), nil
}

// VerifyPassword verifies a password against its hash
func VerifyPassword(password, hash string) bool {
	expectedHash, err := HashPassword(password)
	if err != nil {
		return false
	}
	return expectedHash == hash
}

// GenerateSecureToken generates a secure random token
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// SanitizeInput removes potentially dangerous characters from input
func SanitizeInput(input string) string {
	// Basic sanitization - in production, use a proper sanitization library
	// Remove common SQL injection patterns
	dangerous := []string{"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_", "DROP", "DELETE", "INSERT", "UPDATE", "SELECT"}
	
	result := input
	for _, pattern := range dangerous {
		// Simple replacement - in production, use proper escaping
		result = replaceAll(result, pattern, "")
	}
	
	return result
}

// Simple string replacement function
func replaceAll(s, old, new string) string {
	result := ""
	for i := 0; i < len(s); {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			result += new
			i += len(old)
		} else {
			result += string(s[i])
			i++
		}
	}
	return result
}