package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"afriwonder-api/internal/config"
	"afriwonder-api/internal/httpapi"
)

func main() {
	cfg := config.Load()
	srv := httpapi.NewServer(cfg)
	addr := ":" + cfg.Port
	server := &http.Server{Addr: addr, Handler: srv.Router()}

	go func() {
		log.Printf("api listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
	log.Println("shutdown ok")
}
