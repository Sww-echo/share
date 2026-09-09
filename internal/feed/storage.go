package feed

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"golang.org/x/exp/slog"
)

// DefaultMaxDataSize is the maximum amount of feed item data retained by a
// deployment when no override is configured. It is one GiB.
const DefaultMaxDataSize int64 = 1 << 30

type storageItem struct {
	feedName string
	itemName string
	path     string
	size     int64
	modTime  time.Time
}

// EnforceStorageLimit removes the oldest feed items until the total content
// size is at or below limit. Feed configuration and authentication files are
// intentionally excluded from both the usage calculation and deletion list.
func (m *FeedManager) EnforceStorageLimit(limit int64) (int, error) {
	if limit <= 0 {
		return 0, nil
	}

	// Uploads can finish concurrently. Serialize quota scans and removals so
	// two requests cannot both make deletion decisions from the same snapshot.
	m.storageMu.Lock()
	defer m.storageMu.Unlock()

	entries, err := os.ReadDir(m.path)
	if err != nil {
		return 0, fmt.Errorf("cannot read data directory: %w", err)
	}

	items := make([]storageItem, 0)
	var total int64
	for _, feedEntry := range entries {
		if !feedEntry.IsDir() {
			continue
		}

		feedPath := filepath.Join(m.path, feedEntry.Name())
		feedItems, err := os.ReadDir(feedPath)
		if err != nil {
			return 0, fmt.Errorf("cannot read feed %q: %w", feedEntry.Name(), err)
		}

		for _, itemEntry := range feedItems {
			if isFeedMetadataFile(itemEntry.Name()) || !itemEntry.Type().IsRegular() {
				continue
			}

			info, err := itemEntry.Info()
			if err != nil {
				return 0, fmt.Errorf("cannot stat feed item %q: %w", itemEntry.Name(), err)
			}

			item := storageItem{
				feedName: feedEntry.Name(),
				itemName: itemEntry.Name(),
				path:     filepath.Join(feedPath, itemEntry.Name()),
				size:     info.Size(),
				modTime:  info.ModTime(),
			}
			items = append(items, item)
			total += item.size
		}
	}

	if total <= limit {
		return 0, nil
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].modTime.Equal(items[j].modTime) {
			return items[i].path < items[j].path
		}
		return items[i].modTime.Before(items[j].modTime)
	})

	removed := 0
	var firstErr error
	for _, item := range items {
		if total <= limit {
			break
		}

		if err := m.removeStorageItem(item); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if firstErr == nil {
				firstErr = err
			}
			slog.Error("Unable to remove item for storage quota", slog.String("feed", item.feedName), slog.String("item", item.itemName), slog.String("error", err.Error()))
			continue
		}

		total -= item.size
		removed++
		slog.Info("Removed oldest item for storage quota", slog.String("feed", item.feedName), slog.String("item", item.itemName), slog.Int64("remaining-bytes", total))
	}

	if total > limit && firstErr != nil {
		return removed, fmt.Errorf("storage quota could not be enforced: %w", firstErr)
	}
	return removed, nil
}

func isFeedMetadataFile(name string) bool {
	switch name {
	case "config.json", "secret", "pin":
		return true
	default:
		return false
	}
}

func (m *FeedManager) removeStorageItem(item storageItem) error {
	// Use the normal feed lookup when possible so connected clients receive a
	// removal notification. If a legacy or damaged feed cannot be loaded, the
	// candidate path still comes directly from ReadDir and is safe to remove.
	f, err := m.GetFeed(item.feedName)
	if err != nil {
		return os.Remove(item.path)
	}

	publicItem, err := f.GetPublicItem(item.itemName)
	if err != nil {
		return err
	}
	if err := os.Remove(item.path); err != nil {
		return err
	}

	if m.websocketManager != nil {
		if err := m.websocketManager.NotifyRemove(publicItem); err != nil {
			slog.Warn("Storage quota item removal notification failed", slog.String("feed", item.feedName), slog.String("item", item.itemName), slog.String("error", err.Error()))
		}
	}
	return nil
}
