package feed

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"

	"github.com/Appboy/webpush-go"
)

var FeedConfigErrorCantWrite = errors.New("can't write feed configuration")
var FeedConfigErrorNotFound = errors.New("feed configuration not found")
var FeedConfigErrorInvalid = errors.New("feed configuration invalid")

type FeedConfig struct {
	Secret        string `json:"secret"`
	Subscriptions []webpush.Subscription
	feed          *Feed
}

func (config *FeedConfig) migratev1v2() error {
	if config.Secret == "" {
		secretPath := path.Join(config.feed.Path, "secret")
		b, err := os.ReadFile(secretPath)
		if err != nil {
			return err
		}
		config.Secret = string(b)
	}

	if err := config.Write(); err != nil {
		return err
	}
	os.Remove(path.Join(config.feed.Path, "secret"))
	os.Remove(path.Join(config.feed.Path, "pin"))
	return nil
}

func FeedConfigForFeed(f *Feed) (*FeedConfig, error) {
	result := &FeedConfig{feed: f}

	configPath := path.Join(f.Path, "config.json")
	if _, err := os.Stat(configPath); errors.Is(err, os.ErrNotExist) {
		if err := result.migratev1v2(); err != nil {
			return nil, err
		}

	}
	b, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("%w: %s", FeedConfigErrorNotFound, configPath)
		}
	}
	err = json.Unmarshal(b, result)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", FeedConfigErrorInvalid, configPath)
	}
	return result, nil
}

func (config *FeedConfig) Write() error {
	configPath := path.Join(config.feed.Path, "config.json")

	f, err := os.CreateTemp(config.feed.Path, ".config-*.tmp")
	if err != nil {
		return fmt.Errorf("%w: %s", FeedConfigErrorCantWrite, configPath)
	}
	tmpPath := f.Name()
	defer os.Remove(tmpPath)

	e := json.NewEncoder(f)
	e.SetIndent("", "  ")
	err = e.Encode(config)
	closeErr := f.Close()
	if err != nil || closeErr != nil {
		return fmt.Errorf("%w: %s", FeedConfigErrorCantWrite, configPath)
	}
	if err = os.Rename(tmpPath, configPath); err != nil {
		return fmt.Errorf("%w: %s", FeedConfigErrorCantWrite, configPath)
	}
	return nil
}

func (config *FeedConfig) AddSubscription(s webpush.Subscription) error {
	for _, t := range config.Subscriptions {
		if s.Endpoint == t.Endpoint && s.Keys.Auth == t.Keys.Auth && s.Keys.P256dh == t.Keys.P256dh {
			return nil
		}
	}
	config.Subscriptions = append(config.Subscriptions, s)
	err := config.Write()
	if err != nil {
		return err
	}
	return nil
}

func (config *FeedConfig) DeleteSubscription(s webpush.Subscription) error {
	keepSubscriptions := []webpush.Subscription{}

	for _, t := range config.Subscriptions {
		if s.Endpoint == t.Endpoint && s.Keys.Auth == t.Keys.Auth && s.Keys.P256dh == t.Keys.P256dh {
			continue
		}
		keepSubscriptions = append(keepSubscriptions, t)
	}
	config.Subscriptions = keepSubscriptions
	err := config.Write()
	if err != nil {
		return err
	}
	return nil
}
