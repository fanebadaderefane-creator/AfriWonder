package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"afriwonder-api/internal/config"
)

type Server struct {
	cfg config.Config
	r   *chi.Mux
}

func NewServer(cfg config.Config) *Server {
	r := chi.NewRouter()
	r.Use(middleware.Logger, middleware.Recoverer)
	s := &Server{cfg: cfg, r: r}
	s.routes()
	return s
}

func (s *Server) Router() http.Handler { return s.r }

func (s *Server) routes() {
	s.r.Get("/health", s.health)
	s.r.Get("/api/v1/ping", s.ping)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) ping(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"pong": "afriwonder"})
}
