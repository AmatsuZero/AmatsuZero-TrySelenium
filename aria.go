package main

import (
	"fmt"
	"github.com/AmatsuZero/TrySelenium/aria"
	"log"
	"runtime"
)

func main() {
	os := aria.NewOS()
	switch runtime.GOOS {
	case "windows":
		os.Version = aria.GetWindowsVersion()
	case "linux":
		os.Name, os.Version = aria.GetLinuxVersion()
		fmt.Println(aria.CheckPid())
	}
	log.Println(os)
}
