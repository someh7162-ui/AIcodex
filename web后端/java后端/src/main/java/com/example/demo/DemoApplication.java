//启动类
package com.example.demo;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
//组合注解，是程序的入口，扫描所在包以及子包下的所有组件，并且自动会配置好环境。
@SpringBootApplication
public class DemoApplication {

	//main方法，会启动一个内置的tomcat web服务器 默认端口是8080，可在配置文件中修改端口
	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
