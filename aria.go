package main

import (
	"fmt"
	"github.com/AmatsuZero/AriaConfig/aria"
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
	case "darwin":
		fmt.Println(aria.CheckPid())
	}
	log.Println(os)
}
