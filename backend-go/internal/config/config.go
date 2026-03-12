package config

import "os"

type Config struct {
	Port        string
	PostgresDSN string
	RedisAddr   string
}

func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8080"),
		PostgresDSN: getEnv("POSTGRES_DSN", ""),
		RedisAddr:   getEnv("REDIS_ADDR", "localhost:6379"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
