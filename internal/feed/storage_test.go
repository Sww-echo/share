package feed

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestEnforceStorageLimitRemovesOldestItems(t *testing.T) {
	dataDir := t.TempDir()
	feedDir := filepath.Join(dataDir, "test-feed")
	f, err := NewFeed(feedDir)
	if err != nil {
		t.Fatal(err)
	}

	if err := f.AddItem("text/plain", "", bytes.NewBufferString("old")); err != nil {
		t.Fatal(err)
	}
	oldItems, err := f.Public()
	if err != nil {
		t.Fatal(err)
	}
	oldItem := oldItems.Items[0].Name
	oldPath := filepath.Join(feedDir, oldItem)
	oldTime := time.Unix(1, 0)
	if err := os.Chtimes(oldPath, oldTime, oldTime); err != nil {
		t.Fatal(err)
	}

	if err := f.AddItem("text/plain", "", bytes.NewBufferString("new")); err != nil {
		t.Fatal(err)
	}
	newItems, err := f.Public()
	if err != nil {
		t.Fatal(err)
	}
	var newItem string
	for _, item := range newItems.Items {
		if item.Name != oldItem {
			newItem = item.Name
		}
	}
	if newItem == "" {
		t.Fatal("new item was not created")
	}

	manager := NewFeedManager(dataDir, &WebSocketManager{})
	removed, err := manager.EnforceStorageLimit(3)
	if err != nil {
		t.Fatal(err)
	}
	if removed != 1 {
		t.Fatalf("expected one item to be removed, got %d", removed)
	}
	if _, err := os.Stat(oldPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("old item still exists, stat error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(feedDir, newItem)); err != nil {
		t.Fatalf("new item was removed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(feedDir, "config.json")); err != nil {
		t.Fatalf("feed config was removed: %v", err)
	}
}
